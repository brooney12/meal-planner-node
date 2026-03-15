type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const isDev = import.meta.env.DEV;
const minLevel: LogLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) ?? (isDev ? "debug" : "warn");

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[minLevel];
}

function format(level: LogLevel, message: string, context?: object): string {
  const time = new Date().toISOString().slice(11, 23);
  const ctx = context ? ` ${JSON.stringify(context)}` : "";
  return `[${time}] [${level.toUpperCase()}] ${message}${ctx}`;
}

export const logger = {
  debug: (message: string, context?: object) => {
    if (shouldLog("debug")) console.debug(format("debug", message, context));
  },
  info: (message: string, context?: object) => {
    if (shouldLog("info")) console.info(format("info", message, context));
  },
  warn: (message: string, context?: object) => {
    if (shouldLog("warn")) console.warn(format("warn", message, context));
  },
  error: (message: string, context?: object) => {
    if (shouldLog("error")) console.error(format("error", message, context));
  },
};
