# ⚔️ Ecos de Eldoria — Guía de Instalación

## 📋 Requisitos previos
- Cuenta en [Discord](https://discord.com)
- Cuenta en [GitHub](https://github.com)
- Cuenta en [Render](https://render.com)
- Cuenta en [MongoDB Atlas](https://mongodb.com/atlas)
- Cuenta en [DeepSeek Platform](https://platform.deepseek.com)

---

## 🤖 PASO 1 — Crear el Bot de Discord

1. Ve a [discord.com/developers/applications](https://discord.com/developers/applications)
2. Clic en **New Application** → ponle nombre (ej. "Eldoria Bot")
3. Ve a la sección **Bot** → clic en **Add Bot**
4. En **Privileged Gateway Intents** activa:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
5. Clic en **Reset Token** y copia el token → es tu `DISCORD_TOKEN`
6. Ve a **OAuth2 > URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Use Slash Commands`, `Attach Files`, `Embed Links`, `Read Message History`
7. Copia la URL generada y ábrela para invitar el bot a tu servidor
8. En tu servidor Discord, activa **Modo Desarrollador** (Ajustes > Avanzado)
9. Clic derecho en el servidor → **Copiar ID** → es tu `GUILD_ID`
10. Copia los IDs de cada canal relevante de la misma forma

---

## 🗄️ PASO 2 — Configurar MongoDB Atlas

1. Ve a [mongodb.com/atlas](https://www.mongodb.com/atlas) y crea una cuenta gratuita
2. Crea un **Free Cluster** (M0)
3. En **Database Access**: crea un usuario con contraseña
4. En **Network Access**: agrega `0.0.0.0/0` (permite conexión desde Render)
5. En tu cluster, clic en **Connect > Drivers**
6. Copia la URI y reemplaza `<password>` por tu contraseña → es tu `MONGODB_URI`

---

## 🧠 PASO 3 — Obtener API Key de DeepSeek

1. Ve a [platform.deepseek.com](https://platform.deepseek.com)
2. Crea una cuenta y ve a **API Keys**
3. Clic en **Create API Key** → copia la clave → es tu `DEEPSEEK_API_KEY`
4. Asegúrate de tener créditos (puedes cargar desde $5 USD)

---

## 📁 PASO 4 — Subir a GitHub

1. Crea un repositorio nuevo en [github.com](https://github.com) (puede ser privado)
2. Sube todos los archivos de esta carpeta al repositorio
3. **¡IMPORTANTE!** NO subas el archivo `.env` — el `.gitignore` ya lo excluye

```bash
git init
git add .
git commit -m "Ecos de Eldoria Bot v2.0"
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

---

## 🚀 PASO 5 — Desplegar en Render

1. Ve a [render.com](https://render.com) y crea una cuenta gratuita
2. Clic en **New +** → **Web Service** (o Background Worker)
3. Conecta tu repositorio de GitHub
4. Configura:
   - **Name**: `ecos-de-eldoria-bot`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. En la sección **Environment Variables**, agrega TODAS estas variables:

| Variable | Valor |
|----------|-------|
| `DISCORD_TOKEN` | Token del bot |
| `GUILD_ID` | ID de tu servidor |
| `DEEPSEEK_API_KEY` | Tu API key de DeepSeek |
| `MONGODB_URI` | URI de MongoDB Atlas |
| `CHANNEL_SOLITARIO` | ID del canal #solitario |
| `CHANNEL_GRUPO` | ID del canal #grupo |
| `CHANNEL_TABLON` | ID del canal #tablon |
| `CHANNEL_LOGROS` | ID del canal #logros |
| `CHANNEL_COMANDOS` | ID del canal #comandos |
| `CHANNEL_DADOS` | ID del canal #dados-y-pruebas |

6. Clic en **Create Web Service** → ¡Render desplegará el bot automáticamente!

---

## ⚔️ COMANDOS DEL BOT

| Comando | Descripción |
|---------|-------------|
| `/crear [nombre] [clase]` | Crea tu personaje |
| `/ficha` | Ver tu ficha con imagen |
| `/aventura` | Inicia aventura solitaria |
| `/accion [texto]` | Realiza una acción en tu aventura |
| `/terminar` | Termina la aventura actual |
| `/tablon` | Ver misiones disponibles |
| `/unirse [id]` | Unirse a una misión grupal |
| `/habilidades` | Ver tus habilidades |
| `/inventario` | Ver tu inventario |
| `/top` | Ranking del servidor |
| `/publicar_mision [nivel] [tipo]` | (Admin/DM) Publica nueva misión |

## 🎭 CLASES DISPONIBLES

- ⚔️ **Guerrero** — Tanque y daño cuerpo a cuerpo
- 🔮 **Mago** — Daño mágico masivo, frágil
- 🗡️ **Ladrón** — Velocidad y daño crítico
- ✨ **Clérigo** — Sanador y soporte divino
- 🏹 **Arquero** — Daño a distancia y área
- 🌿 **Druida** — Naturaleza, cura y transformación

---

## 🆘 Problemas comunes

**El bot no responde:** Verifica que el `DISCORD_TOKEN` sea correcto en Render.

**Error de MongoDB:** Asegúrate de que la IP `0.0.0.0/0` esté en Network Access.

**Sin respuesta de DeepSeek:** Verifica que tengas créditos y que la API key sea correcta.

**Comandos no aparecen:** Espera 1-2 minutos tras el primer inicio. Los comandos slash tardan en propagarse.
