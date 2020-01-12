/* Convert computed LL(1) table into javascript source
*/

output_table_js:-
	write('module.exports = {table:'),nl,
	setof(LHS, RHS^(LHS=>RHS), NTs),
	form_table(NTs,'{'),
	nl,write('},').

output_terminals_js:-
	nl,nl,write('var terminal=['),nl,
	tm_regex(Ks),
	member(TM,Ks),
	format('   { name: "~w", regex:new RegExp("^"+~w) }, ~n',[TM,TM]),
	fail.
output_terminals_js:-
        write('];'),nl,nl.
output_keywords_js:-
	tm_keywords(Ps),
	findall(Reg,member(Reg,Ps),Regs),
	nl,nl,write('keywords:/^('),
	output_as_regex_disj(Regs,''),
	write(')/i ,'),nl.
output_punct_js:-
	tm_punct(Ps),
	findall(Reg,member(_=Reg,Ps),Regs),
	nl,write('punct:/^('),
	output_as_regex_disj(Regs,''),
	write(')/ ,'),nl,nl.
output_top_symbol_js:-
	start_symbol(TS),
	format('startSymbol:"~w";~n',[TS]).
output_default_query_type_js:-
	default_query_type(QT),
	format('defaultQueryType:~w;~n',[QT]).
output_lex_version_js:-
	lex_version(LV),
	format('lexVersion:"~w";~n',[LV]).
output_accept_empty_js:-
	accept_empty(AE),
	format('acceptEmpty:"~w";~n',[AE]).

output_vars_js([]).
output_vars_js([Var=Val|Pairs]):-
	format('~w:~w,~n',[Var,Val]),
	output_vars_js(Pairs).

output_as_regex_disj([],_).
output_as_regex_disj([T|Ts],Prefix):-
    format('~w~w',[Prefix,T]),
    output_as_regex_disj(Ts,'|').

form_table([],_).
form_table([NT|NTs],Punc):-
	format('~w~n  "~w" : ',[Punc,NT]),
	findall(First-RHS,m(NT,First,_=>RHS),Pairs),
	output_pairs(Pairs,'{'),
	write('}'),
	form_table(NTs,', ').

output_pairs([],_).
output_pairs([First-RHS|Pairs],Punc):-
	format('~w~n     "~w": ',[Punc,First]),
	write_list_strings(RHS),
	output_pairs(Pairs, ', ').

write_list_strings(Xs):-
	write('['),
	write_list_strings1(Xs,''),
	write(']').

write_list_strings1([],_).
write_list_strings1([X|Xs],Punc):-
	format('~w"~w"',[Punc,X]),
	write_list_strings1(Xs,',').
