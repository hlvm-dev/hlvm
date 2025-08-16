// Simple test to see if Deno.serve works
console.log("Starting simple server test...");

const server = Deno.serve({ 
  port: 11435,
  onListen: ({ hostname, port }) => {
    console.log(`Server listening on http://${hostname}:${port}`);
  }
}, (req) => {
  return new Response("Hello");
});

console.log("Server started, should not block...");

// Test that we can still execute code
setTimeout(() => {
  console.log("Timer works!");
  Deno.exit(0);
}, 1000);