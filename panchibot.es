  server {
      listen      80;
      listen      [::]:80;
      server_name panchibot.es www.panchibot.es;

      location /.well-known/acme-challenge/ {
          root /var/www/certbot;
      }

      location / {
          return 301 https://panchibot.es$request_uri;
      }
  }

  server {
      listen      443 ssl http2;
      listen      [::]:443 ssl http2;
      server_name www.panchibot.es;

      ssl_certificate     /etc/letsencrypt/live/panchibot.es/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/panchibot.es/privkey.pem;
      include /etc/letsencrypt/options-ssl-nginx.conf;
      ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

      return 301 https://panchibot.es$request_uri;
  }

  server {
      listen      443 ssl http2;
      listen      [::]:443 ssl http2;
      server_name panchibot.es;

      ssl_certificate     /etc/letsencrypt/live/panchibot.es/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/panchibot.es/privkey.pem;
      include /etc/letsencrypt/options-ssl-nginx.conf;
      ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
      add_header X-Content-Type-Options    "nosniff"                             always;
      add_header X-Frame-Options           "SAMEORIGIN"                          always;
      add_header X-XSS-Protection          "1; mode=block"                       always;
      add_header Referrer-Policy           "strict-origin-when-cross-origin"     always;
      add_header Permissions-Policy        "camera=(), microphone=(), geolocation=()" always;

      location = /.well-known/security.txt {
          default_type "text/plain; charset=utf-8";
          return 200 "Contact: mailto:jorgeescobaruber@gmail.com\nExpires: 2027-01-01T00:00:00Z\nPreferred-Languages: es, en\n";
      }

      location ~* \.(env|git|svn|htaccess|htpasswd|ini|log|bak|sql|tar|gz|zip)$ {
          return 404;
      }

      location ~* ^/(wp-admin|wp-login\.php|xmlrpc\.php|phpmyadmin|adminer) {
          return 404;
      }

      location / {
          proxy_pass         http://127.0.0.1:8081;
          proxy_http_version 1.1;
          proxy_set_header   Host              $host;
          proxy_set_header   X-Real-IP         $remote_addr;
          proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
          proxy_set_header   X-Forwarded-Proto $scheme;
          proxy_read_timeout 30s;
      }

      access_log /var/log/nginx/panchibot.es.access.log;
      error_log  /var/log/nginx/panchibot.es.error.log warn;
  }
