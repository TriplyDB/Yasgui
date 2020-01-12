
/*

Compute LL1 parse tables.

fi(NT,T) means that T can be the first terminal in NT.  The special
         token epsilon means that NT may rewrite to nothing
         (NT is "nullable").

fo(NT,T) means that nonterminal NT can be followed by terminal T.
         - the final argument is for debugging only, and records
           the nonterminal from which the follower T was copied.

stephen.cresswell@tso.co.uk

*/


ll1_tables:-
	retractall(cf(_,_)),
	retractall(nt(_)),
	retractall(fi(_,_)),
	retractall(fo(_,_)),
	retractall(m(_,_,_)),
	
	validate_rules,
	remember1(change),
	iterate_first,
	remember1(change),
	iterate_follow,
	iterate_matrix.

validate_rules:-
	NT=>_,
	\+ (_=>RHS, memberchk(NT,RHS) ),
	format("Warning: unused non-terminal: ~w~n",[NT]),
	fail.
validate_rules:-
	% (Check the untranslated rules)
	LHS ==> RHS,
	\+RHS=[],
	\+RHS=[_|_],
	format("Warning: atomic RHS: ~w~n",[LHS=>RHS]),
	fail.
validate_rules:-
	_ => RHS,
	member(T,RHS),
	\+ T => _,
	remember(tm(T)),
	fail.
validate_rules:-
	tm(T),
	\+declared_terminal(T),
	format("Warning: undeclared terminal: ~w~n",[T]),
	fail.
validate_rules:-
	declared_terminal(T),
	\+tm(T),
	format("Declared terminal not found in grammar: ~w~n",[T]),
	fail.
validate_rules.

declared_terminal(T):-
	tm_keywords(Ts),
	member(T,Ts).
declared_terminal(T):-
	tm_regex(Ts),
	member(T,Ts).
declared_terminal(T):-
	tm_punct(Ts),
	member(T=_,Ts).

% Repeated until no change
iterate_first:-
	change,
	!,
	retractall(change),
	iterate,
	iterate_first.
iterate_first.

% All possibilities
iterate:-
	first(A,W),
	remember(fi(A,W)),
	fail.
iterate.

assert_terminals:-
	tm(Tm),
	assertz(fi(Tm,Tm)),
	fail.
assert_terminals.
        

first(Tm,Tm):-
	tm(Tm).
first(Nonterm,F):-
        Nonterm=>RHS,
	first_list(RHS,F).

first_list([],epsilon).
first_list([W|RHS],F):-
	fi(W,epsilon),
	first_list(RHS,F).
first_list([W|_],F):-
	fi(W,F),
	F \== epsilon.


iterate_follow:-
	change,
	!,
	retractall(change),
	iterate_f,
	iterate_follow.
iterate_follow.

iterate_f:-
	follow,
	fail.
iterate_f.


follow:-
	B => RHS,
	follow_list(RHS,B).

follow_list([X],B):-
	!,
	copy_follow(B,X).
follow_list([A|RHS],B):-
	tm(A),!,
	follow_list(RHS,B).	
follow_list([A,X2|RHS],B):-
	first_list([X2|RHS],F),
	(F=epsilon -> 
	    copy_follow(B,A)
        ;
	    remember(fo(A,F))
        ),
	follow_list([X2|RHS],B).	

% Whatever can follow B, can follow A
%  (applied when A can be final constituent of B)
copy_follow(B,A):-
	\+tm(A),
	remember1(cf(B,A)),
	fo(B,Fo),
	remember(fo(A,Fo)),
	fail.
copy_follow(_,_).

iterate_matrix:-
	A => RHS,
	first_list(RHS,F),
	F \== epsilon,
	remember1(m(A,F,A=>RHS)),
	fail.
iterate_matrix:-
	A => RHS,
	first_list(RHS,epsilon),
	fo(A,F),
	remember1(m(A,F,A=>RHS)),
	fail.
iterate_matrix.

ll1_check:-
	m(NT,T,R1),
	m(NT,T,R2),
	R1@<R2,
	format('LL(1) clash - ~w, ~w,~n R1=~w~n R2=~w~n',[NT,T,R1,R2]),
	fail.
ll1_check:-
	write('LL(1) check complete.'),nl.
