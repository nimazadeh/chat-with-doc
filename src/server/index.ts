import { createApplication } from './application.js';
import { readConfiguration } from './configuration.js';

try {
  const configuration = readConfiguration(process.env);
  const server = createApplication(configuration);
  server.listen(configuration.port, '0.0.0.0', () => {
    console.log(`Learning workspace listening on port ${configuration.port}`);
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
      server.closeIdleConnections();
    });
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Unable to start the workspace.',
  );
  process.exitCode = 1;
}
