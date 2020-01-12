:-dynamic fo/2.
:-dynamic fi/2.
:-dynamic cf/2.
:-dynamic change/0.
:-dynamic m/3.
:-dynamic tm/1.
:-dynamic '==>'/2.
:-dynamic '=>'/2.
:-op(550,xfy,===>).  % Rewrite rules on EBNF expressions
:-op(500,xfy,==>).   % EBNF grammar productions
:-op(500,xfy,=>).    % BNF grammar productions
:-op(490,xfy,or).
:-op(480,fy,*).
:-op(470,xfy,\).


:-reconsult('rewrite.pl').
:-reconsult('ll1.pl').
:-reconsult('prune').
:-reconsult('output_to_javascript.pl').

go:-
	ebnf_to_bnf,
	prune_for_top_symbol,
	ll1_tables,
	ll1_check,
	output_file(Out),
	write('Writing to '),write(Out),nl,
	tell(Out),
	output_table_js,
	output_keywords_js,
	output_punct_js,
	js_vars(Vars),
	output_vars_js(Vars),
  write('}'),
	told.
	
