// Real-World C++ Interviews Q026: Explain short-circuit evaluation
// Key: `&&` stops after a false left operand and `||` stops after a true left operand because
// the final result is already known. This sequencing is often used to guard a later operation
// that would otherwise be invalid.
#include <iostream>

bool checked() {
    std::cout << "right operand evaluated\n";
    return true;
}

int main() {
    const bool first = false && checked();
    const bool second = true || checked();
    std::cout << first << ' ' << second << '\n';
}
