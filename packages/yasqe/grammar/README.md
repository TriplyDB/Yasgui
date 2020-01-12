# Yet Another SPARQL Query Editor (YASQE) grammar

## Prerequisites

- SWI Prolog

## How to make modifications to grammar:

- Change the Extended Backus-Naur Form (EBNF) grammar in file
  `sparql11-grammar.pl`.  Do not change file `_tokenizer-table.js`.
- Run `./build.sh`.
- Finally, rebuild YASQE from the YASQE home directory by running `npm
  run build` (or `yarn run dev` to test it locally).
