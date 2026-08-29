#include <iostream>
#include <utility>

int main() {
    int state = 7;
    const int old_state = std::exchange(state, 0);

    std::cout << "old state: " << old_state << "\n";
    std::cout << "new state: " << state << "\n";
}
