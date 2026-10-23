import { createServer } from 'node:http';

// The browser suite talks to a real HTTP upstream fixture, never a real model or personal API key.
createServer((request, response) => {
  let body = '';
  request.on('data', (chunk: Buffer) => {
    body += chunk.toString();
  });
  request.on('end', () => {
    const input = JSON.parse(body) as { messages: { content: string }[] };
    const question = input.messages.at(-1)?.content ?? '';
    if (question.includes('/rate-limit/')) {
      response.writeHead(429);
      response.end('{"error":"fixture-only"}');
      return;
    }
    const reply = () => {
      response.setHeader('Content-Type', 'application/json');
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: `${/[\u0600-\u06ff]/.test(question) ? 'یک توضیح روشن دربارهٔ محدوده.' : 'A clear explanation of lexical scope.'}\n\`\`\`js\nconst scope = true;\n\`\`\`\n<script>window.fixtureScriptRan = true;</script>`,
              },
              finish_reason: 'stop',
            },
          ],
        }),
      );
    };
    if (question.includes('/slow/')) {
      const timer = setTimeout(reply, 5000);
      response.on('close', () => clearTimeout(timer));
    } else {
      reply();
    }
  });
}).listen(4184, '127.0.0.1');
