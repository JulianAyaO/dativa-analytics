# Nombre del Proyecto

**Dativa — Plataforma de analítica comercial**

Dativa es una aplicación full stack de analítica para equipos comerciales. Permite explorar ventas y pedidos, construir dashboards con widgets, importar CSV o Excel, configurar alertas y recibir actualizaciones en tiempo real, con control de acceso por roles.

## Demo

`[Añadir URL de la demo en vivo]`

## Descripción general

Dativa está pensada para centralizar el análisis de **Ventas** y **Pedidos** en un solo producto: dashboards, explorador tabular, importación, alertas, notificaciones y administración de usuarios.

Los analistas y administradores pueden crear y editar dashboards, aplicar filtros globales (periodo, región, categoría, producto y vendedor), profundizar en las filas desde un KPI o un ranking, exportar resultados e importar archivos con esquemas específicos por dataset. Los visualizadores consultan la información en modo de solo lectura.

El frontend es el foco del portafolio: Angular 22 zoneless, Signals, un design system propio (`@dativa/ui`) y una app que funciona completa en modo mock. El backend en Spring Boot existe para autenticar, persistir y servir datos reales sobre PostgreSQL, con el mismo contrato analítico `WidgetQuery → WidgetResult`.

## Características

- **Dashboards editables:** paleta de widgets, grid con arrastre y redimensionado, persistencia de layout y configuración.
- **Widgets analíticos:** KPI, series (línea, barras y área), circular, tabla, ranking y progreso, con `ngx-echarts`.
- **Filtros globales:** fecha, región, categoría, producto y vendedor; todos los widgets del dashboard se actualizan juntos.
- **Explorador de transacciones:** búsqueda, orden, paginación, columnas configurables y exportación a CSV o Excel con formato.
- **Drill-down:** un clic en un KPI o en una barra de ranking abre el explorador conservando dataset, periodo y filtros.
- **Importación guiada:** wizard reutilizable con esquemas separados de Ventas y Pedidos, mapeo sugerido, validación, columnas ignorables y omisión de duplicados.
- **Tiempo real:** STOMP/WebSocket con indicador de conexión; el dashboard refresca solo los widgets afectados y el explorador avisa cuando hay datos nuevos.
- **Alertas y notificaciones:** condiciones sobre métricas y avisos en la sesión.
- **Roles:** Administrador, Analista y Visualizador. El visualizador puede abrir dashboards, no editarlos ni importar.
- **Apariencia:** tema claro, oscuro o del sistema, y densidad cómoda o compacta.
- **Administración:** gestión de usuarios y bitácora de actividad (rol ADMIN).

## Screenshots

Añade capturas en esta sección cuando estén disponibles.

```text
[Añadir captura del login]
[Añadir captura del editor de dashboards]
[Añadir captura del explorador]
[Añadir captura de la importación]
```

## Tecnologías utilizadas

### Frontend

- **Angular 22:** aplicación zoneless, lazy routes y Signals.
- **Signal Forms:** formularios con `@angular/forms/signals`.
- **@dativa/ui:** design system del proyecto (tokens, Button, Input, Select, Card, Badge, Empty State, Loading).
- **angular-gridster2:** grid del editor de dashboards.
- **ngx-echarts + ECharts 6:** renderizado de widgets de gráficos.
- **@stomp/stompjs:** cliente WebSocket/STOMP para ventas en vivo.
- **Vitest:** pruebas unitarias.
- **Playwright:** pruebas E2E (login, roles, editor, filtros, explorador y apariencia).

### Backend

- **Java 21:** lenguaje del API.
- **Spring Boot 4.1:** REST, seguridad, validación y configuración.
- **Spring Security + JWT:** autenticación y autorización por roles.
- **Spring Data JPA:** persistencia de usuarios, dashboards, alertas y actividad.
- **JdbcTemplate:** consultas analíticas agregadas y listado de transacciones.
- **Spring WebSocket/STOMP:** canal `/ws` y topic `/topic/sales`.
- **Flyway:** migraciones de PostgreSQL.
- **Maven Wrapper (`mvnw`):** construcción del backend sin instalar Maven.

### Base de datos

- **PostgreSQL 16:** base relacional de usuarios, catálogos, pedidos, líneas, dashboards y alertas.

### Herramientas / Librerías / Servicios

- **Docker Compose:** PostgreSQL local.
- **npm:** gestor de paquetes del frontend.
- **ng-packagr:** empaquetado de la librería `@dativa/ui`.
- **SheetJS (`xlsx`):** lectura de CSV/Excel en la importación.

## Requisitos e instalación

## Requisitos

- Node.js 20 o superior y npm
- Java 21
- Docker Desktop (solo si se usa el API con PostgreSQL)

## Instalación rápida

El login, los dashboards, el explorador y la importación funcionan **sin backend** (`useMockAuth: true` por defecto).

```powershell
# 1. Clonar el repositorio
git clone `[URL del repositorio]`
cd proyecto_dativa

# 2. Instalar y arrancar el frontend
cd frontend
npm install
npm start
```

La app queda en `http://localhost:4200`.

Cuentas de demostración, contraseña `Dativa123!` (también hay botones de inicio rápido en el login):

- `admin@dativa.app` — Administrador
- `analyst@dativa.app` — Analista
- `viewer@dativa.app` — Visualizador (consulta, no edición)

### Backend (opcional)

Hace falta Docker para PostgreSQL. Maven no tiene que estar instalado: el wrapper `mvnw` viene en el proyecto.

```powershell
# Desde la raíz del repositorio
docker compose up -d

cd backend
.\mvnw.cmd spring-boot:run
```

En macOS o Linux: `./mvnw spring-boot:run`.

Comprueba el API en:

```text
http://localhost:8080/api/health
```

Cuando el API esté arriba, cambia `useMockAuth` a `false` en `frontend/apps/dativa-web/src/environments/environment.ts`. Auth, dashboards y analítica pasan a PostgreSQL; el frontend sigue usando el contrato `WidgetQuery → WidgetResult`.

## Variables de entorno

No hace falta un `.env` para el flujo mock. En desarrollo local con API, los valores de `backend/src/main/resources/application.properties` suelen ser suficientes.

| Variable | Descripción |
| -------- | ----------- |
| `spring.datasource.url` | Conexión a PostgreSQL (`jdbc:postgresql://localhost:5432/dativa`) |
| `spring.datasource.username` / `password` | Credenciales de la base (`dativa` / `dativa` en local) |
| `dativa.jwt.secret` | Clave para firmar y validar JWT |
| `dativa.jwt.expiration-ms` | Caducidad del token |
| `dativa.cors.allowed-origins` | Orígenes permitidos (`http://localhost:4200` por defecto) |
| `dativa.realtime.demo-publisher` | Publica un `SaleCreated` de demostración cada 12 s |
| `useMockAuth` | En el frontend: `true` usa datos locales; `false` consume el API |

## Despliegue

El proyecto está orientado a **desarrollo y ejecución en entorno local**. Por el momento no hay una demo pública.

## Estructura del proyecto

```text
proyecto_dativa/
├── backend/                 # API Spring Boot (auth, analítica, importación, tiempo real)
├── frontend/                # Workspace Angular (app + design system)
│   ├── apps/dativa-web/     # aplicación web
│   ├── libs/dativa-ui/      # componentes y tokens de @dativa/ui
│   └── e2e/                 # pruebas Playwright
├── docker-compose.yml       # PostgreSQL local
└── README.md
```

## Tests

```powershell
cd frontend
npm test
npm run test:ui
npm run e2e
```

`npm test` y `npm run test:ui` son Vitest. `npm run e2e` es Playwright (Chromium): arranca Dativa en el puerto 4300.

```powershell
cd backend
.\mvnw.cmd test
```

## Autor

**Julian Aya Orozco**

[![GitHub](https://img.shields.io/badge/GitHub-JulianAyaO-181717?style=flat&logo=github)](https://github.com/JulianAyaO)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Julian_Aya_Orozco-0A66C2?style=flat&logo=linkedin)](https://www.linkedin.com/in/julian-aya-orozco-338a78431/)
