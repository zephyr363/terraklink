import { useState, type FormEvent } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { Blocks, ArrowUpRight } from "lucide-react";
import {
  authSlice,
  useCsrfQuery,
  useLoginMutation,
  errorMessage,
} from "../../store/api";
export function Login({ onSuccess }: { onSuccess: () => void }) {
  const dispatch = useDispatch();
  const { isSuccess: csrfReady } = useCsrfQuery();
  const [login, { isLoading }] = useLoginMutation();
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const result = await login({
        username: String(data.get("username")),
        password: String(data.get("password")),
      }).unwrap();
      dispatch(authSlice.actions.setAccess(result.access));
      onSuccess();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <div className="admin-login">
      <div className="login-card">
        <Blocks className="accent" size={40} />
        <span className="eyebrow">TerraKlink Admin</span>
        <h1>Вход для редактора</h1>
        <p className="muted">Редактируйте содержание и оформление страниц.</p>
        <form onSubmit={submit}>
          <label>
            Логин
            <input name="username" required autoComplete="username" />
          </label>
          <label>
            Пароль
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button className="button" disabled={isLoading || !csrfReady}>
            {isLoading ? "Входим…" : "Войти"}
            <ArrowUpRight size={18} />
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
        <Link to="/">← Вернуться на сайт</Link>
      </div>
    </div>
  );
}
