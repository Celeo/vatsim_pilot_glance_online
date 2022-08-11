import { Application, colors, log, parseArgs, Router } from "./deps.ts";
const { green } = colors;

const HOSTNAME = "0.0.0.0";
const PORT = 8000;

/**
 * CLI flags.
 */
export interface CliFlags {
  debug: boolean;
}

/**
 * Create the server, its endpoints, and the handlers, and launch.
 */
function main(): void {
  const app = new Application();
  const router = new Router();

  // ~~~~~~~
  // Logging
  // ~~~~~~~
  app.use(async (context, next) => {
    log.debug(
      `Request to ${green(context.request.url.pathname)} from ${green(
        context.request.ip
      )}`
    );
    await next();
    log.debug(`Returning HTTP ${green(`${context.response.status}`)}`);
  });

  // ~~~~~~
  // Errors
  // ~~~~~~
  app.use(async (context, next) => {
    try {
      await next();
    } catch (err) {
      log.error(err);
      context.response.status = 500;
      context.response.body = `Error: ${err}`;
    }
  });

  router
    // ~~~~~~~~
    // API root
    // ~~~~~~~~
    .get("/stuff", (context) => {
      context.response.body = "Hello world";
      context.response.status = 200;
    });

  app.use(router.routes());
  app.use(router.allowedMethods());

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Attempt to serve static files
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  app.use(async (context, next) => {
    try {
      await context.send({
        root: `${Deno.cwd()}/static`,
        index: "index.html",
      });
    } catch (e) {
      if (e?.name !== "NotFoundError") {
        log.error(`Could not serve static file: ${e}`);
      }
    }
    await next();
  });

  // ~~~~~~
  // Launch
  // ~~~~~~
  app.listen({ hostname: HOSTNAME, port: PORT });
  log.info(`Listening on ${green(`http://${HOSTNAME}:${PORT}`)}`);
}

/**
 * CLI entrypoint.
 */
if (import.meta.main) {
  const args = parseArgs(Deno.args);
  if (args.h == true || args.help === true) {
    console.log(`vatsim_pilot_glance_online

USAGE:
  server [FLAGS]
FLAGS:
    -h, --help      Show this help
    -d, --debug     Enable debug logging`);
  } else {
    const flags: CliFlags = { debug: args.d || args.debug || false };
    await log.setup({
      handlers: {
        console: new log.handlers.ConsoleHandler(
          flags.debug ? "DEBUG" : "INFO",
          { formatter: "[{levelName}] {msg}" }
        ),
      },
      loggers: {
        default: {
          level: flags.debug ? "DEBUG" : "INFO",
          handlers: ["console"],
        },
      },
    });
    main();
  }
}
