%
% Find and remove inaccessible non-terminals
%
% The is used because we have SPARQL1.1 query / update
% grammars together, but it helps (e.g. to keep autocompletion clean) 
% for the grammars to be separated.  This is done on the basis
% of reachability from the top symbol.
%
% stephen.cresswell@tso.co.uk

prune_for_top_symbol:-
	top_symbol(Top),
	reachable_syms(Top,NTs,_Ts),
        findall(NT,(NT=>_RHS,\+memberchk(NT,NTs)),UnreachableNTs0),
        sort(UnreachableNTs0,UnreachableNTs),
        delete_NTs(UnreachableNTs).

delete_NTs([]).
delete_NTs([NT|NTs]):-
	format('Removing unreachable nonterminal ~w~n',[NT]),
	retractall(NT=>_),
	delete_NTs(NTs).

reachable_syms(Top,NTs,Ts):-
	NTs=[Top|_],
	reachable(NTs,NTs,Ts),
	once(append(NTs,[],NTs)),
	once(append(Ts,[],Ts)).
	
reachable([],_,_):-!.
reachable([NT|NTs1],NTs0,Ts):-
	once(findall(A,(NT=>RHS,member(A,RHS)),As)),
	includes_rhs(As,NTs0,Ts),
	reachable(NTs1,NTs0,Ts).

includes_rhs([],_,_).
includes_rhs([A|As],NTs0,Ts):-
	A=>_,!,
	% Non-terminal
	memberchk(A,NTs0),
	includes_rhs(As,NTs0,Ts).
includes_rhs([A|As],NTs0,Ts):-
	memberchk(A,Ts),
	includes_rhs(As,NTs0,Ts).

write_list([]).
write_list([H|T]):-
	write(H),nl,
	write_list(T).
