import { contentApi } from "./api";
type Counter = {
  day: string;
  path: string;
  event: string;
  language: string;
  count: number;
};
type Revision = {
  number: number;
  action: string;
  created_at: string;
  editor__username: string | null;
};
type Asset = { id: number; name: string; kind: string; url: string };
export const workspaceApi = contentApi.injectEndpoints({
  endpoints: (builder) => ({
    analytics: builder.query<
      {
        days: number;
        totals: { event: string; count: number }[];
        daily: { day: string; count: number }[];
        truncated: boolean;
        counters: Counter[];
        leads: { status: string; count: number }[];
      },
      number
    >({ query: (days) => `editor/analytics/?days=${days}` }),
    history: builder.query<Revision[], void>({
      query: () => "editor/history/",
      providesTags: ["Draft"],
    }),
    library: builder.query<Asset[], void>({ query: () => "editor/library/" }),
    restore: builder.mutation<
      { revision: number },
      { number: number; revision: number }
    >({
      query: (body) => ({ url: "editor/restore/", method: "POST", body }),
      invalidatesTags: ["Draft"],
    }),
    leadStatus: builder.mutation<void, { id: number; status: string }>({
      query: ({ id, status }) => ({
        url: `editor/leads/${id}/`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Leads"],
    }),
  }),
});
