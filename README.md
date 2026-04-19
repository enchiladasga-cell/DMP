# 🎲 DnD Discord Bot — Dungeon Master

Bot de Dungeon Master para Discord con reglas D&D 5e simplificadas, aventuras incluidas, sistema de combate, inventario y tienda.

---

## 📋 Requisitos previos

- Node.js 18+
- Cuenta de GitHub
- Cuenta en [Render.com](https://render.com) (gratis)
- Cuenta en [MongoDB Atlas](https://cloud.mongodb.com) (gratis)
- Cuenta en [Discord Developer Portal](https://discord.com/developers/applications)

---

## 🚀 Guía de instalación completa

### PASO 1 — Crear el Bot en Discord

1. Ve a [discord.com/developers/applications](https://discord.com/developers/applications)
2. Clic en **"New Application"** → ponle un nombre (ej: "DM Bot")
3. Ve a **Bot** → clic en **"Add Bot"**
4. En **Privileged Gateway Intents**, activa:
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**
5. Clic en **"Reset Token"** y copia el token → guárdalo (es tu `DISCORD_TOKEN`)
6. Ve a **OAuth2 → General** y copia el **Client ID** (es tu `DISCORD_CLIENT_ID`)

### PASO 2 — Invitar el Bot a tu servidor

1. Ve a **OAuth2 → URL Generator**
2. En **Scopes** marca: `bot` y `applications.commands`
3. En **Bot Permissions** marca:
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Use Slash Commands
4. Copia la URL generada y ábrela en tu navegador
5. Selecciona tu servidor y autoriza

### PASO 3 — Configurar MongoDB Atlas

1. Ve a [cloud.mongodb.com](https://cloud.mongodb.com) y crea cuenta gratis
2. Crea un **cluster gratuito (M0)**
3. En **Database Access** → crea un usuario con contraseña
4. En **Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`)
5. En **Database** → clic en **Connect** → **Drivers** → copia la cadena de conexión
   - Formato: `mongodb+srv://usuario:password@cluster.mongodb.net/dndbot`
   - Reemplaza `<password>` con tu contraseña
   - Guárdala (es tu `MONGODB_URI`)

### PASO 4 — Subir a GitHub

```bash
# Clonar o crear el repo
git init
git add .
git commit -m "Initial commit — DnD Bot"
git remote add origin https://github.com/TU_USUARIO/dnd-bot.git
git push -u origin main
```

> ⚠️ Asegúrate de que `.env` está en `.gitignore` (ya está configurado)

### PASO 5 — Desplegar en Render

1. Ve a [render.com](https://render.com) y crea cuenta gratis
2. Clic en **"New +"** → **"Web Service"**
3. Conecta tu repositorio de GitHub
4. Configura el servicio:
   - **Name**: `dnd-discord-bot`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. En **Environment Variables** agrega:
   ```
   DISCORD_TOKEN = tu_token_aqui
   DISCORD_CLIENT_ID = tu_client_id_aqui
   MONGODB_URI = tu_uri_mongodb_aqui
   ```
6. Clic en **"Create Web Service"**

> 💡 **Nota**: El plan gratuito de Render duerme el bot tras 15 min de inactividad. Para mantenerlo activo considera un servicio de ping como [UptimeRobot](https://uptimerobot.com).

### PASO 6 — Registrar los Slash Commands

Una vez el bot esté corriendo, ejecuta esto **una sola vez** localmente:

```bash
# Primero crea tu .env local con las variables
cp .env.example .env
# Edita el .env con tus valores reales

npm install
node src/commands/deploy.js
```

Verás: `✅ Comandos registrados exitosamente.`

Los comandos tardan hasta 1 hora en aparecer globalmente en Discord (normalmente son pocos minutos).

---

## 🎮 Comandos del Bot

| Comando | Descripción |
|---------|-------------|
| `/ayuda` | Guía completa para principiantes |
| `/crear_personaje` | Crea tu héroe (nombre + clase) |
| `/personaje` | Ve tu ficha de personaje |
| `/inventario` | Gestiona tus objetos y equipamiento |
| `/tienda` | Compra equipo con oro |
| `/tirar` | Tira dados (1d20, 2d6+3, etc.) |
| `/lista_aventuras` | Ve todas las aventuras disponibles |
| `/aventura` | Inicia una aventura con tu grupo |
| `/ranking` | Clasificación del servidor |
| `/borrar_personaje` | Elimina tu personaje (irreversible) |

---

## ⚔️ Clases disponibles

| Clase | Dado de vida | Rol |
|-------|-------------|-----|
| ⚔️ Guerrero | d10 | Tanque y daño físico |
| 🔮 Mago | d6 | Daño mágico devastador |
| 🗡️ Pícaro | d8 | Críticos y sigilo |
| ✨ Clérigo | d8 | Sanación y soporte |
| 🏹 Arquero | d8 | Daño a distancia |
| 🪓 Bárbaro | d12 | Fuerza bruta |

---

## 📜 Aventuras incluidas

### 🟢 Corta (~30 min) — Nivel 1+
- **🍺 La Taberna Maldita** — Un espíritu aterroriza a los viajeros. Múltiples finales según las decisiones del grupo.

### 🟡 Media (~60 min) — Nivel 2+
- **⛏️ La Mina de los Olvidados** — Espectros de mineros muertos buscan descanso eterno. Tesoros ocultos y decisiones morales.

### 🔴 Larga (~2h) — Nivel 4+
- **💀 La Torre del Lich** — El Lich Malachar amenaza el reino. Tres plantas de desafíos. Jefe final con mecánica de Filacteria.

---

## 🌟 Sistema de Loot Legendario

Los objetos legendarios tienen **~1-3% de probabilidad** en jefes finales. Son los más poderosos del juego y nunca aparecen en la tienda.

**Armas legendarias:**
- ⚔️ Amanecer Eterno (Espada +3, daño radiante)
- 🗡️ Sombra del Vacío (Daga +3, maldición)
- 🏹 Arco del Cazador Eterno (Arco +3, sin penalización cobertura)
- 🪓 Furia de Trueno (Hacha +3, aturde enemigos)
- 🔮 Báculo del Archimago (Bastón +3, cargas de hechizo)

**Armaduras legendarias:**
- 🛡️ Égida del Dragón Carmesí (CA 21, resistencia fuego)
- 🌑 Manto de Estrellas (Teletransportación)
- ⛓️ Cadenas del Titán (Inmune a empuje)

---

## 🗂️ Estructura del proyecto

```
dnd-bot/
├── src/
│   ├── index.js              # Entrada principal
│   ├── commands/
│   │   ├── deploy.js         # Registrar comandos (ejecutar 1 vez)
│   │   ├── aventura.js
│   │   ├── ayuda.js
│   │   ├── borrar_personaje.js
│   │   ├── crear_personaje.js
│   │   ├── inventario.js
│   │   ├── lista_aventuras.js
│   │   ├── personaje.js
│   │   ├── ranking.js
│   │   └── tirar.js
│   ├── models/
│   │   ├── Character.js      # Modelo MongoDB personaje
│   │   └── Session.js        # Modelo MongoDB sesión de aventura
│   ├── data/
│   │   ├── classes.js        # Clases y estadísticas
│   │   ├── items.js          # Objetos, loot y tienda
│   │   └── adventures.js     # Aventuras con nodos
│   └── utils/
│       ├── dice.js           # Sistema de dados
│       ├── sessionManager.js # Lógica de aventuras y combate
│       └── adventureSuggester.js # Sugerencias automáticas
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## ❓ Problemas frecuentes

**El bot no responde a comandos**
→ Ejecuta `node src/commands/deploy.js` para registrar los comandos. Espera 1-5 minutos.

**Error de MongoDB**
→ Verifica que la IP `0.0.0.0/0` esté permitida en Network Access de MongoDB Atlas.

**El bot en Render se duerme**
→ Usa [UptimeRobot](https://uptimerobot.com) para hacer ping a la URL de Render cada 5 minutos (gratis).

**Los personajes no se guardan**
→ Verifica la variable `MONGODB_URI` en las environment variables de Render.

