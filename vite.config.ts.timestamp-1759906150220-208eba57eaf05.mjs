// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import JavaScriptObfuscator from "file:///home/project/node_modules/javascript-obfuscator/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.debug", "console.warn"]
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "zustand", "web3"],
          ui: ["lucide-react", "react-chartjs-2", "chart.js"],
          particles: ["react-particles", "tsparticles-engine", "tsparticles-slim"]
        },
        renderChunk(code, chunk) {
          if (chunk.fileName.endsWith(".js")) {
            const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
              compact: true,
              controlFlowFlattening: true,
              controlFlowFlatteningThreshold: 0.75,
              deadCodeInjection: true,
              deadCodeInjectionThreshold: 0.4,
              debugProtection: true,
              debugProtectionInterval: 4e3,
              disableConsoleOutput: true,
              identifierNamesGenerator: "hexadecimal",
              log: false,
              numbersToExpressions: true,
              renameGlobals: false,
              rotateStringArray: true,
              selfDefending: true,
              shuffleStringArray: true,
              splitStrings: true,
              splitStringsChunkLength: 10,
              stringArray: true,
              stringArrayEncoding: ["base64"],
              stringArrayThreshold: 0.75,
              transformObjectKeys: true,
              unicodeEscapeSequence: false
            });
            return obfuscationResult.getObfuscatedCode();
          }
          return code;
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgSmF2YVNjcmlwdE9iZnVzY2F0b3IgZnJvbSAnamF2YXNjcmlwdC1vYmZ1c2NhdG9yJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICBidWlsZDoge1xuICAgIHNvdXJjZW1hcDogZmFsc2UsXG4gICAgbWluaWZ5OiAndGVyc2VyJyxcbiAgICB0ZXJzZXJPcHRpb25zOiB7XG4gICAgICBjb21wcmVzczoge1xuICAgICAgICBkcm9wX2NvbnNvbGU6IHRydWUsXG4gICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWUsXG4gICAgICAgIHB1cmVfZnVuY3M6IFsnY29uc29sZS5sb2cnLCAnY29uc29sZS5pbmZvJywgJ2NvbnNvbGUuZGVidWcnLCAnY29uc29sZS53YXJuJ11cbiAgICAgIH1cbiAgICB9LFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICB2ZW5kb3I6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3p1c3RhbmQnLCAnd2ViMyddLFxuICAgICAgICAgIHVpOiBbJ2x1Y2lkZS1yZWFjdCcsICdyZWFjdC1jaGFydGpzLTInLCAnY2hhcnQuanMnXSxcbiAgICAgICAgICBwYXJ0aWNsZXM6IFsncmVhY3QtcGFydGljbGVzJywgJ3RzcGFydGljbGVzLWVuZ2luZScsICd0c3BhcnRpY2xlcy1zbGltJ11cbiAgICAgICAgfSxcbiAgICAgICAgcmVuZGVyQ2h1bmsoY29kZSwgY2h1bmspIHtcbiAgICAgICAgICBpZiAoY2h1bmsuZmlsZU5hbWUuZW5kc1dpdGgoJy5qcycpKSB7XG4gICAgICAgICAgICBjb25zdCBvYmZ1c2NhdGlvblJlc3VsdCA9IEphdmFTY3JpcHRPYmZ1c2NhdG9yLm9iZnVzY2F0ZShjb2RlLCB7XG4gICAgICAgICAgICAgIGNvbXBhY3Q6IHRydWUsXG4gICAgICAgICAgICAgIGNvbnRyb2xGbG93RmxhdHRlbmluZzogdHJ1ZSxcbiAgICAgICAgICAgICAgY29udHJvbEZsb3dGbGF0dGVuaW5nVGhyZXNob2xkOiAwLjc1LFxuICAgICAgICAgICAgICBkZWFkQ29kZUluamVjdGlvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgZGVhZENvZGVJbmplY3Rpb25UaHJlc2hvbGQ6IDAuNCxcbiAgICAgICAgICAgICAgZGVidWdQcm90ZWN0aW9uOiB0cnVlLFxuICAgICAgICAgICAgICBkZWJ1Z1Byb3RlY3Rpb25JbnRlcnZhbDogNDAwMCxcbiAgICAgICAgICAgICAgZGlzYWJsZUNvbnNvbGVPdXRwdXQ6IHRydWUsXG4gICAgICAgICAgICAgIGlkZW50aWZpZXJOYW1lc0dlbmVyYXRvcjogJ2hleGFkZWNpbWFsJyxcbiAgICAgICAgICAgICAgbG9nOiBmYWxzZSxcbiAgICAgICAgICAgICAgbnVtYmVyc1RvRXhwcmVzc2lvbnM6IHRydWUsXG4gICAgICAgICAgICAgIHJlbmFtZUdsb2JhbHM6IGZhbHNlLFxuICAgICAgICAgICAgICByb3RhdGVTdHJpbmdBcnJheTogdHJ1ZSxcbiAgICAgICAgICAgICAgc2VsZkRlZmVuZGluZzogdHJ1ZSxcbiAgICAgICAgICAgICAgc2h1ZmZsZVN0cmluZ0FycmF5OiB0cnVlLFxuICAgICAgICAgICAgICBzcGxpdFN0cmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgIHNwbGl0U3RyaW5nc0NodW5rTGVuZ3RoOiAxMCxcbiAgICAgICAgICAgICAgc3RyaW5nQXJyYXk6IHRydWUsXG4gICAgICAgICAgICAgIHN0cmluZ0FycmF5RW5jb2Rpbmc6IFsnYmFzZTY0J10sXG4gICAgICAgICAgICAgIHN0cmluZ0FycmF5VGhyZXNob2xkOiAwLjc1LFxuICAgICAgICAgICAgICB0cmFuc2Zvcm1PYmplY3RLZXlzOiB0cnVlLFxuICAgICAgICAgICAgICB1bmljb2RlRXNjYXBlU2VxdWVuY2U6IGZhbHNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBvYmZ1c2NhdGlvblJlc3VsdC5nZXRPYmZ1c2NhdGVkQ29kZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gY29kZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFdBQVc7QUFDbEIsT0FBTywwQkFBMEI7QUFFakMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLE9BQU87QUFBQSxJQUNMLFdBQVc7QUFBQSxJQUNYLFFBQVE7QUFBQSxJQUNSLGVBQWU7QUFBQSxNQUNiLFVBQVU7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLGVBQWU7QUFBQSxRQUNmLFlBQVksQ0FBQyxlQUFlLGdCQUFnQixpQkFBaUIsY0FBYztBQUFBLE1BQzdFO0FBQUEsSUFDRjtBQUFBLElBQ0EsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osUUFBUSxDQUFDLFNBQVMsYUFBYSxXQUFXLE1BQU07QUFBQSxVQUNoRCxJQUFJLENBQUMsZ0JBQWdCLG1CQUFtQixVQUFVO0FBQUEsVUFDbEQsV0FBVyxDQUFDLG1CQUFtQixzQkFBc0Isa0JBQWtCO0FBQUEsUUFDekU7QUFBQSxRQUNBLFlBQVksTUFBTSxPQUFPO0FBQ3ZCLGNBQUksTUFBTSxTQUFTLFNBQVMsS0FBSyxHQUFHO0FBQ2xDLGtCQUFNLG9CQUFvQixxQkFBcUIsVUFBVSxNQUFNO0FBQUEsY0FDN0QsU0FBUztBQUFBLGNBQ1QsdUJBQXVCO0FBQUEsY0FDdkIsZ0NBQWdDO0FBQUEsY0FDaEMsbUJBQW1CO0FBQUEsY0FDbkIsNEJBQTRCO0FBQUEsY0FDNUIsaUJBQWlCO0FBQUEsY0FDakIseUJBQXlCO0FBQUEsY0FDekIsc0JBQXNCO0FBQUEsY0FDdEIsMEJBQTBCO0FBQUEsY0FDMUIsS0FBSztBQUFBLGNBQ0wsc0JBQXNCO0FBQUEsY0FDdEIsZUFBZTtBQUFBLGNBQ2YsbUJBQW1CO0FBQUEsY0FDbkIsZUFBZTtBQUFBLGNBQ2Ysb0JBQW9CO0FBQUEsY0FDcEIsY0FBYztBQUFBLGNBQ2QseUJBQXlCO0FBQUEsY0FDekIsYUFBYTtBQUFBLGNBQ2IscUJBQXFCLENBQUMsUUFBUTtBQUFBLGNBQzlCLHNCQUFzQjtBQUFBLGNBQ3RCLHFCQUFxQjtBQUFBLGNBQ3JCLHVCQUF1QjtBQUFBLFlBQ3pCLENBQUM7QUFDRCxtQkFBTyxrQkFBa0Isa0JBQWtCO0FBQUEsVUFDN0M7QUFDQSxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
