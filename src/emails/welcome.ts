export function renderWelcome(displayName: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido al Prode de Beno</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a,#dc2626);padding:32px 40px;text-align:center;">
              <div style="font-size:32px;font-weight:900;color:#ffffff;letter-spacing:-1px;">
                El Prode <span style="color:#fbbf24;">de Beno</span>
              </div>
              <div style="font-size:13px;color:#bfdbfe;margin-top:6px;letter-spacing:2px;text-transform:uppercase;">Mundial 2026</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="font-size:18px;color:#e2e8f0;margin:0 0 16px;">Hola <strong style="color:#fbbf24;">${displayName}</strong>,</p>
              <p style="font-size:16px;color:#94a3b8;line-height:1.7;margin:0 0 24px;">
                ¡Ya estás dentro del Prode de Beno!
              </p>
              <p style="font-size:15px;color:#94a3b8;line-height:1.7;margin:0 0 32px;">
                Podés predecir todos los partidos de la fase de grupos, elegir quién llega a la final, responder las preguntas especiales y armar una liga privada con tus amigos para ver quién sabe más de fútbol.
              </p>
              <p style="font-size:15px;color:#64748b;margin:0 0 32px;">
                Todo gratis. Sin letra chica.
              </p>
              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);border-radius:10px;padding:1px;">
                    <a href="https://elprodedebeno.com.ar/predictions"
                       style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;">
                      Hacer mi prode →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:15px;color:#94a3b8;margin:0;">¡Buena suerte!</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;padding:20px 40px;text-align:center;border-top:1px solid #334155;">
              <p style="font-size:12px;color:#475569;margin:0;">El equipo de El Prode de Beno · <a href="https://elprodedebeno.com.ar" style="color:#475569;">elprodedebeno.com.ar</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
