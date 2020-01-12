
top_symbol(sparql11).
output_file('_tokenizer-table.js').

js_vars([
  startSymbol='"sparql11"',
  acceptEmpty=true
]).

:-reconsult(gen_ll1).
:-reconsult('../sparql11-grammar.pl').
