export const sanitizeHtml = (content: string): string => {
  // Basic dependency-free sanitizer replacing dangerous tags
  return content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};