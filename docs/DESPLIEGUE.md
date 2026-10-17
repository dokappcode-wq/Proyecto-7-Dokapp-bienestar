# Publicar Dokapp gratis: Netlify + Supabase

Netlify aloja la app (gratis). Supabase guarda las cuentas, los perfiles, las fotos, los seguidores y los grupos (gratis hasta 500 MB de base de datos y 1 GB de fotos).

## 1. Crear el proyecto de Supabase (5 min)

1. Entra en https://supabase.com y crea una cuenta y un proyecto nuevo (región: *West EU* o *Central EU*). Guarda la contraseña de la base de datos que te pida.
2. En el menú izquierdo, abre **SQL Editor** → **New query**. Pega todo el contenido de `supabase-schema.sql` y pulsa **Run**. Debe terminar en *Success*. Si lo vuelves a ejecutar no pasa nada.
3. Abre **Authentication** → **Sign In / Providers** → **Email**:
   - Para empezar sin complicaciones, desactiva **Confirm email**: así la gente entra nada más registrarse.
   - Si prefieres que confirmen el correo, déjalo activado y haz el paso 6.
4. Abre **Project Settings** → **API** (o el botón **Connect**) y copia:
   - **Project URL**, del tipo `https://abcdefgh.supabase.co`.
   - La clave **anon public**, una cadena larga que empieza por `eyJ…`, o la *publishable key*, que empieza por `sb_publishable_…`.

## 2. Configurar la app (1 min)

Abre `dokapp-web/config.js` con cualquier editor de texto y rellena los dos valores:

```js
window.DOKAPP_CONFIG = {
  supabaseUrl: 'https://abcdefgh.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi…',
};
```

La clave *anon* es pública por diseño. Lo que protege los datos son las reglas de seguridad (RLS) que creó el script SQL. **Nunca pongas aquí la clave `service_role`.**

## 3. Subir a Netlify (1 min)

1. Entra en https://app.netlify.com/drop (puedes crear la cuenta gratis en ese momento).
2. Arrastra **la carpeta `dokapp-web`** completa (o un zip cuyo primer nivel contenga `index.html`) a la página. Si subes una carpeta o un zip que tenga `dokapp-web` dentro, Netlify mostrará «Page not found» porque no encuentra `index.html` en la raíz.
3. Si el sitio aparece como **Private**, pulsa **Make public** para que otras personas puedan entrar.
4. Netlify te da una dirección del tipo `https://nombre-raro.netlify.app`. Puedes cambiarla en **Site configuration** → **Change site name**.

Para actualizar la app más adelante: en tu sitio de Netlify, pestaña **Deploys**, vuelve a arrastrar la carpeta.

## 4. Avisar a Supabase de tu dirección (1 min)

En Supabase → **Authentication** → **URL Configuration**:

- **Site URL**: tu dirección de Netlify, por ejemplo `https://dokapp.netlify.app`.
- **Redirect URLs**: añade la misma dirección.

Así los correos de confirmación y de recuperación llevan a tu app.

## 5. Probar

Abre tu dirección de Netlify y crea una cuenta. En **Perfil → Ajustes**, al final, debe poner *Almacenamiento: Supabase (nube)*. Si pone *Este dispositivo*, revisa `config.js`.

Para probar la red social, crea una segunda cuenta en otro navegador o en el móvil, búscala en **Social → Personas** y síguela. También puedes crear un grupo y compartir su código de invitación.

## Problemas frecuentes

| Síntoma | Solución |
| --- | --- |
| «Te hemos enviado un correo para confirmar tu cuenta» | Confirma el correo, o desactiva **Confirm email** (paso 1.3). |
| El correo de confirmación lleva a `localhost` | Revisa la **Site URL** (paso 4). |
| «No hemos podido cargar tus datos» | El script SQL no se ejecutó completo: vuelve a ejecutarlo en el SQL Editor. |
| Las fotos no aparecen | Comprueba en **Storage** que existe el bucket `photos`; lo crea el script. |
| Supabase pausa el proyecto | Los proyectos gratuitos se pausan tras 7 días sin uso. Entra en el panel y pulsa **Restore**. |

## Límites del plan gratuito

- **Supabase**: 500 MB de base de datos, 1 GB de archivos, 50.000 usuarios activos al mes. Se pausa tras una semana sin actividad.
- **Netlify**: 100 GB de transferencia al mes.

Para un grupo de amistades o un piloto es más que suficiente.
