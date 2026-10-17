import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  ContentResponse,
  Lead,
  LeadRequest,
  ProductListItem,
  ProductDetailItem,
} from "../domain/content";

export const authSlice = createSlice({
  name: "auth",
  initialState: { access: "" },
  reducers: {
    setAccess(state, action: PayloadAction<string>) {
      state.access = action.payload;
    },
  },
});
const rawQuery = fetchBaseQuery({
  baseUrl: "/api/",
  credentials: "same-origin",
  prepareHeaders(headers, { getState }) {
    const access = (getState() as { auth: { access: string } }).auth.access;
    if (access) headers.set("Authorization", `Bearer ${access}`);
    const csrf = document.cookie
      .split("; ")
      .find((item) => item.startsWith("csrftoken="))
      ?.split("=")[1];
    if (csrf) headers.set("X-CSRFToken", decodeURIComponent(csrf));
    return headers;
  },
});
let refreshPromise: Promise<string | null> | null = null;
// A single refresh request prevents rotating the same cookie concurrently.
const authenticatedQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extra) => {
  let result = await rawQuery(args, api, extra);
  const url = typeof args === "string" ? args : args.url;
  if (result.error?.status === 401 && url.startsWith("editor/")) {
    if (!refreshPromise)
      refreshPromise = (async () => {
        await rawQuery("auth/csrf/", api, extra);
        const refresh = await rawQuery(
          { url: "auth/refresh/", method: "POST" },
          api,
          extra,
        );
        const access =
          (refresh.data as { access?: string } | undefined)?.access ?? null;
        api.dispatch(authSlice.actions.setAccess(access ?? ""));
        return access;
      })().finally(() => {
        refreshPromise = null;
      });
    if (await refreshPromise) result = await rawQuery(args, api, extra);
  }
  return result;
};

export const contentApi = createApi({
  reducerPath: "contentApi",
  baseQuery: authenticatedQuery,
  tagTypes: ["Content", "Draft", "Leads"],
  endpoints: (builder) => ({
    config: builder.query<
      {
        languages: string[];
        upload_limits: { image_mb: number; video_mb: number };
      },
      void
    >({
      query: () => "config/",
    }),
    publicContent: builder.query<ContentResponse, void>({
      query: () => "content/",
      providesTags: ["Content"],
    }),
    draft: builder.query<ContentResponse, void>({
      query: () => "editor/content/",
      providesTags: ["Draft"],
    }),
    csrf: builder.query<{ csrfToken: string }, void>({
      query: () => "auth/csrf/",
    }),
    login: builder.mutation<
      { access: string },
      { username: string; password: string }
    >({ query: (body) => ({ url: "auth/login/", method: "POST", body }) }),
    logout: builder.mutation<void, void>({
      query: () => ({ url: "auth/logout/", method: "POST" }),
    }),
    save: builder.mutation<
      ContentResponse,
      { revision: number; document: ContentResponse["document"] }
    >({
      query: (body) => ({ url: "editor/content/", method: "PUT", body }),
      invalidatesTags: ["Draft"],
    }),
    publish: builder.mutation<ContentResponse, { revision: number }>({
      query: (body) => ({ url: "editor/publish/", method: "POST", body }),
      invalidatesTags: ["Content", "Draft"],
    }),
    upload: builder.mutation<
      { url: string; kind: "image" | "video" },
      FormData
    >({ query: (body) => ({ url: "editor/media/", method: "POST", body }) }),
    createLead: builder.mutation<{ id: number }, LeadRequest>({
      query: (body) => ({ url: "leads/", method: "POST", body }),
      invalidatesTags: ["Leads"],
    }),
    leads: builder.query<Lead[], void>({
      query: () => "editor/leads/",
      providesTags: ["Leads"],
    }),
    products: builder.query<
      {
        count: number;
        page_size: number;
        page: number;
        total_pages: number;
        has_next: boolean;
        has_previous: boolean;
        results: ProductListItem[];
      },
      {
        language?: string;
        category?: string;
        search?: string;
        min_price?: string;
        max_price?: string;
        promo_only?: boolean;
        sort?: string;
        page?: number;
        page_size?: number;
      }
    >({
      query: (params) => ({
        url: "products/",
        params: {
          language: params.language ?? "ru",
          category: params.category,
          search: params.search,
          min_price: params.min_price,
          max_price: params.max_price,
          promo_only: params.promo_only ? "true" : undefined,
          sort: params.sort ?? "default",
          page: params.page ?? 1,
          page_size: params.page_size ?? 12,
        },
      }),
      transformResponse: (response: {
        count: number;
        page_size: number;
        page: number;
        total_pages: number;
        has_next: boolean;
        has_previous: boolean;
        results: ProductListItem[];
      }) => response,
    }),
    productDetail: builder.query<ProductDetailItem, { code: string; language?: string }>({
      query: ({ code, language = "ru" }) => ({
        url: `products/${code}/`,
        params: { language },
      }),
    }),
  }),
});
export const {
  useConfigQuery,
  usePublicContentQuery,
  useDraftQuery,
  useCsrfQuery,
  useLoginMutation,
  useLogoutMutation,
  useSaveMutation,
  usePublishMutation,
  useUploadMutation,
  useCreateLeadMutation,
  useLeadsQuery,
  useProductsQuery,
  useProductDetailQuery,
} = contentApi;

// DRF errors may be a string, a list, or nested field errors.
function validationMessages(value: unknown, depth = 0): string[] {
  if (depth > 5) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value))
    return value
      .slice(0, 10)
      .flatMap((item) => validationMessages(item, depth + 1));
  if (value && typeof value === "object")
    return Object.values(value)
      .slice(0, 10)
      .flatMap((item) => validationMessages(item, depth + 1));
  return [];
}

export function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "status" in error) {
    const e = error as { status: number | string; data?: unknown };
    if (e.status === 409)
      return "Другой редактор изменил страницу. Скопируйте свои изменения и загрузите актуальную версию.";
    if (e.status === 401 || e.status === 403)
      return "Нет доступа. Проверьте логин, пароль и права редактора.";
    if (e.status === 429) return "Слишком много запросов. Попробуйте позже.";
    if (e.status === 413) return "Файл превышает допустимый размер загрузки.";
    if (e.status === 503)
      return "Сервис временно недоступен. Повторите позже; локальные правки сохранены.";
    if (e.status === 400)
      return (
        [...new Set(validationMessages(e.data))]
          .slice(0, 10)
          .join(" ")
          .slice(0, 2000) ||
        "Проверьте поля: телефон, согласие, ссылки и допустимые значения."
      );
  }
  return "Не удалось выполнить запрос. Проверьте соединение с сервером.";
}
