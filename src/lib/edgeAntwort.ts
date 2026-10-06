/**
 * Antwort einer Edge Function auch bei Status 4xx/5xx lesen.
 *
 * supabase.functions.invoke gibt bei einem Fehlerstatus `data = null` und
 * einen FunctionsHttpError zurueck, dessen Text nur "Edge Function returned
 * a non-2xx status code" lautet. Die eigentliche Antwort (z. B.
 * { error: 'active_subscription', message: '…' }) steckt in error.context.
 * Ohne das sahen Eltern beim Loeschen nur den technischen Text (06.10.2026).
 */
export async function edgeAntwort<T = Record<string, unknown>>(
  data: T | null,
  error: unknown,
): Promise<T | null> {
  if (data) return data;
  const kontext = (error as { context?: unknown } | null)?.context;
  if (kontext && typeof (kontext as Response).json === 'function') {
    try {
      return (await (kontext as Response).clone().json()) as T;
    } catch {
      /* keine JSON-Antwort */
    }
  }
  return null;
}
