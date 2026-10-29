/** These prompts contain one flat object: authored strings and fixed references.
 * Unlike WebLLM's default JSON grammar, ASCII whitespace runs are finite, even
 * inside authored strings. Storage validators still enforce text lengths. */
export function outputFormat(schema: string): { grammar: string; instruction: string } {
  const { properties } = JSON.parse(schema) as { properties: Record<string, { enum?: string[] }> };
  const rules: string[] = [];
  const fields = Object.entries(properties).map(([key, value], index) => {
    const name = `value${index}`;
    if (value.enum?.length === 1) rules.push(`${name} ::= ${JSON.stringify(JSON.stringify(value.enum[0]))}`);
    else rules.push(`${name} ::= prose`);
    return `${JSON.stringify(JSON.stringify(key))} ws ":" ws ${name}`;
  });
  return {
    grammar: [`root ::= "{" ws ${fields.join(' ws "," ws ')} ws "}"`,
      'ws ::= [ \\t\\n\\r]{0,2}',
      // Literal Unicode is allowed; JSON escapes only for quotes/slashes. The
      // requested short prose is one line, not a whitespace-filled code block.
      'prose ::= "\\\"" character (" "? character)* "\\\""',
      'character ::= [^"\\\\\\x00-\\x20] | "\\\\" ["\\\\/]', ...rules].join('\n'),
    instruction: 'Return only one JSON object with these fields, in this order: '
      + Object.entries(properties).map(([key, value]) => value.enum?.length === 1
        ? `${key}=${JSON.stringify(value.enum[0])}` : `${key}=your own short Japanese ${key === 'body' || key === 'text' ? 'reply' : 'heading'}`).join(', ') + '.',
  };
}
