// Daily C++ Interview Q128: Explain the difference between pre- and post increment/decrement
// operators
// Key: Prefix increment modifies the operand and yields the incremented object, normally as an
// lvalue reference. Postfix increment also modifies the operand but returns the old value as a
// separate result, which can require extra work for user-defined types.
#include <iostream>

int main() {
    int prefix = 1;
    int postfix = 1;
    const int new_value = ++prefix;
    const int old_value = postfix++;
    std::cout << new_value << ' ' << old_value << ' ' << postfix << '\n';
}
