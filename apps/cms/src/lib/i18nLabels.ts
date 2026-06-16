type Translator = (key: any) => string

export function statusLabel(t: Translator, status: string) {
  const key = `status.${status}`
  const translated = t(key)
  return translated === key ? status : translated
}

export function roleLabel(t: Translator, role: string) {
  const key = `role.${role}`
  const translated = t(key)
  return translated === key ? role : translated
}
