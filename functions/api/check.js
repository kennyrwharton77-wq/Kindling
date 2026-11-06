// The middleware already validated the access code; reaching here means it's good (or none is set).
import { json } from "../../lib/shared.js";

export const onRequestPost = ({ env }) =>
  json({ ok: true, email: Boolean(env.RESEND_API_KEY && env.RESEND_FROM) || env.MOCK_AI === "1" });
