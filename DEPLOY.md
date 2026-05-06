# Guía de despliegue — SmartCampusAI

## Estructura del repo
```
SmartCampusAI - Front/
├── backend/          ← FastAPI (se despliega en Render)
│   ├── app/
│   ├── csp_engine/   ← código CSP + archivos .xlsx de datos
│   ├── requirements.txt
│   └── render.yaml
└── frontend/         ← React/Vite (se despliega en Vercel)
    ├── src/
    ├── vercel.json
    └── .env.example
```

---

## 1. Subir el código a GitHub

```bash
git init
git add .
git commit -m "feat: preparar proyecto para deploy"
git remote add origin https://github.com/TU_USUARIO/smartcampusai.git
git push -u origin main
```

> Verifica que el `.env` real NO esté en el commit (el `.gitignore` ya lo excluye).

---

## 2. Desplegar el Backend en Render

1. Entra a [render.com](https://render.com) y crea una cuenta
2. **New > Web Service** → conecta tu repo de GitHub
3. Configura:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Python version:** 3.11
4. En **Environment Variables** agrega:
   - `DATABASE_URL` → tu URL de Supabase (la que ya tienes en el `.env`)
   - `SECRET_KEY` → una clave larga y aleatoria (puedes usar el generador de Render)
   - `FRONTEND_URL` → déjalo vacío por ahora, lo llenas después
5. Click en **Deploy** y espera ~3 minutos
6. Copia la URL que te da Render: `https://smartcampusai-backend.onrender.com`

---

## 3. Desplegar el Frontend en Vercel

1. Entra a [vercel.com](https://vercel.com) y crea una cuenta
2. **New Project** → importa tu repo de GitHub
3. Configura:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. En **Environment Variables** agrega:
   - `VITE_API_URL` → la URL de Render del paso anterior
     (ej: `https://smartcampusai-backend.onrender.com`)
5. Click en **Deploy**
6. Copia la URL de Vercel: `https://smartcampusai.vercel.app`

---

## 4. Conectar frontend ↔ backend (CORS)

Vuelve a Render y actualiza la variable de entorno:
- `FRONTEND_URL` → la URL de Vercel (ej: `https://smartcampusai.vercel.app`)

Render redesplegará automáticamente.

---

## 5. Verificar que todo funciona

- Abre la URL de Vercel → debe cargar el login
- Regístrate y entra al dashboard
- Si eres admin, ejecuta el solver

### Endpoints útiles para verificar el backend:
- `GET /` → `{"message": "SmartCampusAI API corriendo"}`
- `GET /docs` → documentación interactiva de la API (Swagger)

---

## Notas importantes

- **Render free tier** pone el servidor a dormir después de 15 min de inactividad.
  La primera petición puede tardar ~30 segundos en "despertar". Es normal.
- **Supabase free tier** tiene límite de 500MB de base de datos y 2GB de transferencia/mes.
- El `.env` real NUNCA debe subirse al repo. Las credenciales van solo en los dashboards de Render y Vercel.
