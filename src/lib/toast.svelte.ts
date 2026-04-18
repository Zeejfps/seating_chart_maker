let message: string | null = $state(null);
let timer: ReturnType<typeof setTimeout> | null = null;

export function getToast(): string | null {
  return message;
}

export function showToast(msg: string, durationMs = 1800): void {
  message = msg;
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(() => {
    message = null;
    timer = null;
  }, durationMs);
}
