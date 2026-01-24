// Type declarations for markdown role file imports
// Bun supports importing text files with `{ type: "text" }`

declare module "*.md" {
  const content: string;
  export default content;
}
