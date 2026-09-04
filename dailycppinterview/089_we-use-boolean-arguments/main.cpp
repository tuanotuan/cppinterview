// Real-World C++ Interviews Q089: Why shouldn’t we use boolean arguments?
// Key: A boolean argument hides meaning at the call site and often signals two behaviors packed
// into one function. Prefer a named enum, options type, or separate named functions when the
// choice represents a domain mode rather than a simple predicate.
#include <iostream>

enum class WriteMode { append, truncate };

void write(WriteMode mode) {
    std::cout << (mode == WriteMode::append ? "append" : "truncate") << '\n';
}

int main() {
    write(WriteMode::append);
}
