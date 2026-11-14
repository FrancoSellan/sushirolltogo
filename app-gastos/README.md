# SushiRoll · Sueldos

App para liquidar los sueldos semanales (cocina, delivery, empaque y encargado/cajero) y exportar el PDF.

## Usarla en tu compu

```bash
npm install
npm run dev
```

Abrí http://localhost:3000. La contraseña está en `.env.local` (`APP_PASSWORD`).
Los datos quedan en `data/sushiroll.db`.

Para cargar los empleados iniciales (sólo si la base está vacía):

```bash
node --env-file=.env.local scripts/seed.mjs
```

## Cómo funciona

- **Empleados**: alta, edición, baja y desactivación. Cocina cobra por hora, empaque por día, encargado/cajero un fijo semanal y delivery un monto que cargás a mano cada semana. Doble rol = crear la persona dos veces, una por rol.
- **Semanas** (lunes a domingo): al crear una semana se cargan todos los empleados activos. Cargás horas, adelantos y notas; se guarda solo.
- **Formulario de empaque**: `/empaque` es público (no pide contraseña). Lo que marquen se carga en la semana abierta más reciente: días trabajados + días dobles (cada doble cuenta como un día más). Si alguien lo manda dos veces, vale el último envío.
- **Cerrar semana**: congela los valores. Los cambios de sueldo en Empleados no tocan semanas cerradas.
- **PDF**: botón "Descargar PDF" en cada semana.

## Subirla a internet (Vercel + Turso)

1. Crear una base gratis en https://turso.tech y copiar la **URL** (`libsql://...`) y el **token**.
2. Subir esta carpeta a un repositorio privado de GitHub.
3. En https://vercel.com importar el repositorio y definir las variables de entorno:
   - `APP_PASSWORD`: tu contraseña
   - `AUTH_SECRET`: un texto largo y aleatorio
   - `DATABASE_URL`: la URL de Turso
   - `DATABASE_AUTH_TOKEN`: el token de Turso
4. Cargar los empleados en la base de producción:
   `DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... node scripts/seed.mjs`
5. En el celular, abrí la URL y usá "Agregar a pantalla de inicio".
