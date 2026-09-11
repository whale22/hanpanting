const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginInput({ email, password }) {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  const normalizedPassword = String(password ?? "");

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return { ok: false, errorCode: "INVALID_EMAIL" };
  }

  if (normalizedPassword.length < 8 || normalizedPassword.length > 128) {
    return { ok: false, errorCode: "INVALID_PASSWORD" };
  }

  return {
    ok: true,
    value: {
      email: normalizedEmail,
      password: normalizedPassword
    }
  };
}

export function validateSignupInput({ email, name, password }) {
  const loginValidation = validateLoginInput({ email, password });
  const normalizedName = String(name ?? "").trim();

  if (!loginValidation.ok) {
    return loginValidation;
  }

  if (normalizedName.length < 2 || normalizedName.length > 40) {
    return { ok: false, errorCode: "INVALID_NAME" };
  }

  return {
    ok: true,
    value: {
      ...loginValidation.value,
      name: normalizedName
    }
  };
}
