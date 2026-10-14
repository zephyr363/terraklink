import { configureStore } from "@reduxjs/toolkit";
import { authSlice, contentApi } from "./api";
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    [contentApi.reducerPath]: contentApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(contentApi.middleware),
});
export type RootState = ReturnType<typeof store.getState>;
