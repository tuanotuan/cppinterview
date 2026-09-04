// Real-World C++ Interviews Q146: How many return statements should you have in a function?
// Key: There is no useful universal limit. Multiple early returns and guard clauses often make
// a short function clearer by removing nesting; if many exits are hard to reason about, reduce
// the function's size and responsibilities rather than enforcing one-return dogma.
#include <iostream>

int classify(int value) {
    if (value < 0) return -1;
    if (value == 0) return 0;
    return 1;
}

int main() {
    std::cout << classify(-1) << ' ' << classify(0) << ' ' << classify(1) << '\n';
}
