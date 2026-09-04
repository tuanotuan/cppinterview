// Real-World C++ Interviews Q143: Should you prefer a switch statement or chained if
// statements?
// Key: Use `switch` for one discrete integral or enum discriminator, especially when exhaustive
// enum diagnostics help; use `if` for ranges, unrelated predicates, or heterogeneous
// conditions. Readability and domain shape matter more than assuming one is inherently faster.
#include <iostream>

enum class State { idle, running, stopped };

const char* name(State state) {
    switch (state) {
        case State::idle: return "idle";
        case State::running: return "running";
        case State::stopped: return "stopped";
    }
    return "invalid";
}

int main() {
    std::cout << name(State::running) << '\n';
}
