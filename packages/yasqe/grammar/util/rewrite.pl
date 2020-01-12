
/*
  Compile EBNF rules (==>) to BNF rules (=>).
   - i.e. expanding out *, +, ?, 'or'

stephen.cresswell@tso.co.uk
*/


ebnf_to_bnf:-
	retractall(_=>_),
	remember(change),
	rewrite_until_stable.

rewrite_until_stable:-
	change,
	!,
	retractall(change),
	rewrite_any,
	rewrite_until_stable.
rewrite_until_stable.

rewrite_any:-
	LHS==>RHS0,
	rewrite(RHS0,RHS1),
	remember(LHS=>RHS1),
	fail.
rewrite_any.


*(A) ===> A_star :-
	atom(A),
	format(atom(A_star),"*~w",[A]),
	remember(A_star=>[]),
	remember(A_star=>[A,A_star]).

+(A) ===> A_plus :-
	atom(A),
	format(atom(A_plus),"+~w",[A]),
	remember(A_plus==>[A,*(A)]). % Assert as EBNF - requires further wrangling

?(A) ===> A_qm :-
	atom(A),
	format(atom(A_qm),"?~w",[A]),
	remember(A_qm=>[]),
	remember(A_qm=>[A]).

+A \ B ===> A_or_B :-
	format(atom(A_or_B),"(~w or ~w)",[A,B]),
	remember(A_or_B=>[A]),
	remember(A_or_B=>[B]).

List ===> ListAtom :-
	List = [_|_],
	format(atom(ListAtom),"~w",[List]),
	remember(ListAtom=>List).

OrExpr ===> ListAtom :-
	OrExpr =.. [or|Args],
	format(atom(ListAtom),"or(~w)",[Args]),
	map_disjuncts(Args,ListAtom).

map_disjuncts([],_).
map_disjuncts([D|Ds],Head):-
	remember(Head=>[D]),
	map_disjuncts(Ds,Head).

% Apply rewrite rules starting from inside outwards
rewrite([],[]).
rewrite([T0|Ts0],[T2|Ts1]):-
	\+(T0 = [_|_]),
	T0 =.. [F|Args0],
	!,
	rewrite(Args0,Args1),
	T1 =.. [F|Args1],
	rewrite_if_poss(T1,T2),
	rewrite(Ts0,Ts1).
rewrite([T0|Ts0],[T2|Ts1]):-
	% A raw list (that is a sequence rather than an argument list)
	T0 = [_|_],
	rewrite(T0,T1),
	rewrite_if_poss(T1,T2),
	rewrite(Ts0,Ts1).

rewrite_if_poss(T0,T1):-
	T0 ===> T1,
        !.
rewrite_if_poss(T,T).

remember(X):-
	call(X),
	!.
remember(X):-
	%write(X),nl,
	assertz(change),
	assertz(X).

% Do avoid duplication, but don't assert change
remember1(X):-
	call(X),
	!.
remember1(X):-
	%write(X),nl,
	assertz(X).
