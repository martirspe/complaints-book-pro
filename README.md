
# reclamofacil-client — Frontend Angular

SPA Angular 21 para la gestión de Libro de Reclamaciones digital con arquitectura multi-tenant. Formulario público de reclamos con validación avanzada, dashboard de gestión, autenticación vía API Key y branding dinámico por tenant.

**Stack:** Angular 21 • TypeScript 5.9 • RxJS • Vite • ng-recaptcha

---

## 🎯 Funcionalidad principal

### Sistema de reclamos público
- **Formulario wizard multi-paso** (4 pasos con barra de progreso)
- **Validación dinámica** según tipo de documento (DNI, RUC, Pasaporte, etc.)
- **Autocompletado de clientes** basado en documento (búsqueda por debounce)
- **Gestión de tutores** para menores de edad
- **Adjuntos de archivos** con validación (imágenes, PDFs)
- **reCAPTCHA v2** para prevención de spam
- **Vista previa de datos** antes de envío final

### Catálogos dinámicos
- Tipos de documento (DNI, RUC, Pasaporte, Carnet de Extranjería, Brevete)
- Tipos de consumo (Producto/Servicio)
- Tipos de reclamo (Reclamo/Queja con descripciones)
- Monedas (PEN, USD)

### Multi-tenant
- **Resolución automática** del tenant desde la URL
- **Branding dinámico** por tenant:
  - Colores primario y acento (CSS variables)
  - Logos claro y oscuro
  - Favicon dinámico
  - Nombre de empresa
- **Aislamiento de datos** por tenant

### Dashboard administrativo
- Vista de gestión de reclamos (en desarrollo)
- Autenticación JWT para usuarios admin
- Panel de control multi-tenant

---

## 🏗️ Arquitectura

```
src/
├── app/
│   ├── pages/
│   │   ├── form/              # Formulario público de reclamos (wizard)
│   │   └── dashboard/         # Panel administrativo
│   ├── services/
│   │   ├── auth.service.ts    # Gestión de API Key
│   │   ├── claims.service.ts  # CRUD de reclamos, clientes, tutores
│   │   └── tenant.service.ts  # Branding y configuración del tenant
│   ├── interceptors/
│   │   └── auth.interceptor.ts  # Inyección de x-api-key en requests
│   ├── interfaces/            # TypeScript interfaces (10+ tipos)
│   ├── shared/
│   │   └── toast/             # Sistema de notificaciones
│   └── app.routes.ts          # Rutas lazy-loaded
├── assets/
│   ├── css/                   # Bootstrap, Line Awesome icons
│   ├── fonts/                 # Fuentes personalizadas
│   └── images/                # Imágenes y backgrounds
└── environments/
    ├── environment.ts         # Desarrollo
    └── environment.prod.ts    # Producción
```

### Componentes principales

#### FormComponent (Formulario de reclamos)
- **Wizard de 4 pasos** con navegación forward/backward
- **Validación en tiempo real** con mensajes específicos
- **Búsqueda de cliente por documento** con debounce (300ms)
- **Validación por tipo de documento**:
  - DNI: 8 dígitos
  - RUC: 11 dígitos
  - Pasaporte: 6-12 alfanuméricos
  - Carnet de Extranjería: 9-12 dígitos
- **Gestión de menores**: formulario de tutor obligatorio si < 18 años
- **Adjuntos**: imágenes y PDFs con preview
- **Vista de revisión**: resumen antes de envío

#### TenantService
- **Carga dinámica de branding** desde API
- **3 effects Angular**:
  1. Aplicar colores (CSS variables)
  2. Actualizar título de página
  3. Cambiar favicon dinámicamente
- **Signals** para reactividad moderna

#### ClaimsService
- **CRUD completo** de reclamos
- **Gestión de clientes y tutores**
- **Catálogos** (tipos de documento, consumo, reclamo, monedas)
- **Asignación y resolución** de reclamos

---

## 🚀 Inicio rápido

### Requisitos
- **Node.js 18+** (incluye npm)
- Angular CLI 21+

### Instalación
```bash
cd reclamofacil-client
npm install
```

### Desarrollo
```bash
npm start
# o
ng serve

# Abre automáticamente http://localhost:4200
```

### Producción
```bash
ng build --configuration production
# Archivos en dist/
```

---

## ⚙️ Configuración

### Variables de entorno

**Development** (`src/environments/environment.ts`):
```typescript
export const environment = {
  production: false,
  API_URL_CLAIM: 'http://localhost:3000',
  PUBLIC_API_KEY: 'tu-api-key-aqui',
  RECAPTCHA_V2_KEY: 'tu-recaptcha-key'
};
```

**Production** (`src/environments/environment.prod.ts`):
```typescript
export const environment = {
  production: true,
  API_URL_CLAIM: 'https://api.tudominio.com',
  PUBLIC_API_KEY: 'tu-api-key-produccion',
  RECAPTCHA_V2_KEY: 'tu-recaptcha-key-produccion'
};
```

### Obtener API Key
1. Ejecuta el seed en el backend: `npm run seed`
2. Copia la API Key impresa en consola
3. Pégala en `environment.ts` → `PUBLIC_API_KEY`

### Configurar reCAPTCHA
1. Obtén keys en https://www.google.com/recaptcha/admin
2. Usa reCAPTCHA v2 "Checkbox"
3. Configura `RECAPTCHA_V2_KEY` en environments

---

## 🎨 Personalización de branding

### CSS Variables (auto-aplicadas por tenant)
```css
:root {
  --brand-primary: #007bff;  /* Color principal del tenant */
  --brand-accent: #6c757d;   /* Color de acento */
}
```

### Assets por tenant
- **Logos**: cargados desde API del backend
- **Favicon**: actualizado dinámicamente
- **Título**: `{company_brand} | Libro de Reclamaciones`

El sistema carga automáticamente el branding del tenant resuelto.

---

## 📡 Integración con el backend

### Endpoints consumidos
```typescript
// Catálogos
GET /api/document_types
GET /api/consumption_types
GET /api/claim_types
GET /api/currencies

// Clientes
POST   /api/customers
GET    /api/customers/document/:number
GET    /api/customers/:id
PUT    /api/customers/:id
DELETE /api/customers/:id

// Tutores
POST   /api/tutors
GET    /api/tutors/document/:number
GET    /api/tutors/:id
PUT    /api/tutors/:id
DELETE /api/tutors/:id

// Reclamos
GET    /api/tenants/:slug/claims
GET    /api/tenants/:slug/claims/:id
POST   /api/integrations/:slug/claims  // Crear con API key
PUT    /api/tenants/:slug/claims/:id
DELETE /api/tenants/:slug/claims/:id
PATCH  /api/tenants/:slug/claims/:id/assign
PATCH  /api/tenants/:slug/claims/:id/resolve

// Branding
GET /api/tenants/:slug
```

### Autenticación
Todas las requests incluyen automáticamente:
```
x-api-key: {API_KEY desde environment}
```

---

## 🛠️ Scripts disponibles

```bash
npm start          # Desarrollo con auto-open (http://localhost:4200)
npm run build      # Build de producción
npm run watch      # Build con watch mode
npm test           # Tests unitarios con Karma
ng generate component <name>  # Crear nuevo componente
ng generate service <name>    # Crear nuevo servicio
```

---

## 📦 Dependencias principales

### Core
- **@angular/core**: ^21.0.6
- **@angular/router**: ^21.0.6 (lazy loading)
- **@angular/forms**: ^21.0.6 (reactive forms)
- **rxjs**: ~7.8.1 (observables, signals)

### UI/UX
- **ng-recaptcha**: ^13.2.1 (protección anti-spam)
- **Bootstrap**: 5.x (via assets/css)
- **Line Awesome**: icons (via assets/fonts)

### Dev
- **TypeScript**: ~5.9.3
- **Angular CLI**: ~21.0.4
- **Vite**: builder integrado en Angular 21

---

## 🎯 Flujo de usuario

### 1. Carga inicial
1. App carga branding del tenant (colores, logos, favicon)
2. Se aplican CSS variables dinámicamente
3. Se cargan catálogos desde API

### 2. Formulario de reclamo
**Paso 1: Datos personales**
- Búsqueda automática por documento
- Validación según tipo de documento
- Gestión de menor de edad (requiere tutor)

**Paso 2: Tipo de consumo**
- Selección Producto/Servicio
- Tipo de reclamo (Reclamo/Queja)

**Paso 3: Detalles**
- Descripción (min 100 caracteres)
- Monto y moneda
- Adjuntos opcionales
- reCAPTCHA

**Paso 4: Revisión**
- Vista previa de todos los datos
- Confirmación y envío

### 3. Confirmación
- Toast de éxito
- Número de reclamo generado
- Instrucciones de seguimiento

---

## 🔒 Seguridad

- **reCAPTCHA v2**: protección contra bots
- **API Key en interceptor**: todas las requests autenticadas
- **Validación client-side**: antes de envío al servidor
- **CORS**: configurado en el backend
- **Sanitización**: inputs validados con Angular Forms

---

## 📚 Más información

### Backend API
Consulta [../reclamofacil-server/README.md](../reclamofacil-server/README.md) para:
- Endpoints completos
- Autenticación y tenancy
- Modelos de datos
- Variables de entorno del servidor

### Documentación del monorepo
Ver [../README.md](../README.md) para setup completo con Docker.

---

## 🤝 Contribución

Para agregar nuevas funcionalidades:
1. Crea interfaces en `src/app/interfaces/`
2. Agrega métodos al servicio correspondiente
3. Actualiza el componente con la lógica
4. Implementa validaciones en formularios reactivos
5. Testea con el backend local
