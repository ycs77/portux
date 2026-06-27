import type { WellKnownPort } from '../types.ts'

/**
 * Curated list of common tool and service default ports.
 * The common mode lists only these, so developers can see at a glance which
 * memorable ports are still free.
 */
export const WELL_KNOWN_PORTS: WellKnownPort[] = [
  { port: 80, label: 'HTTP' },
  { port: 443, label: 'HTTPS' },
  { port: 3000, label: 'React / Next.js dev server' },
  { port: 3001, label: 'Common alt dev server' },
  { port: 3306, label: 'MySQL / MariaDB' },
  { port: 4000, label: 'Phoenix / generic dev' },
  { port: 4200, label: 'Angular dev server' },
  { port: 5000, label: 'Flask / .NET dev' },
  { port: 5173, label: 'Vite dev server' },
  { port: 5174, label: 'Vite (alt)' },
  { port: 5432, label: 'PostgreSQL' },
  { port: 5672, label: 'RabbitMQ' },
  { port: 6379, label: 'Redis' },
  { port: 8000, label: 'Django / http-server' },
  { port: 8080, label: 'Webpack / Tomcat / proxy' },
  { port: 8081, label: 'Common alt HTTP' },
  { port: 8443, label: 'HTTPS (alt)' },
  { port: 9000, label: 'PHP-FPM / SonarQube' },
  { port: 9200, label: 'Elasticsearch' },
  { port: 9229, label: 'Node.js inspector' },
  { port: 11211, label: 'Memcached' },
  { port: 1433, label: 'SQL Server' },
  { port: 25, label: 'SMTP' },
  { port: 27017, label: 'MongoDB' },
]
