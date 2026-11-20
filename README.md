# METALTRACK

Seguimiento de pedidos y piezas de una empresa metalúrgica. Primera versión (MVP), alojada en el PC del taller.

## Carpetas

- `web/` — la aplicación (Next.js + TypeScript + Tailwind + Prisma + SQLite).
- `docs/` — especificación de requerimientos.
- `demo/` — demo visual de una sola página (solo referencia de diseño).

## Arrancar en el PC

```bash
cd web
npm install
npx prisma migrate deploy
npm run db:seed
npm run build
npm start
```

Se abre en <http://localhost:3000>. Desde otro equipo de la misma red: `http://IP-DEL-PC:3000`.

El usuario inicial es `admin` y su contraseña está en `web/.env` (`ADMIN_PASSWORD`). Cámbiala antes de usarlo en serio.

## Datos

Todo vive en un solo archivo: `web/prisma/metaltrack.db`. Para hacer una copia de seguridad, cierra la app y copia ese archivo.

## Pruebas

```bash
cd web
npm test
```

## Decisiones tomadas

- La entrega es un acto posterior a terminar todos los procesos, no un proceso del recorrido.
- Los pedidos se archivan, no se borran; la bitácora es de solo inserción.
- "Atrasado" es una alerta calculada por fecha, no un estado.
- Una pieza por pedido (pendiente de confirmar con la pregunta P10).
