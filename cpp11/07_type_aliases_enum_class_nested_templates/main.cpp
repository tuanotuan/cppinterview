#include <iostream>
#include <vector>

using Scores = std::vector<int>;

enum class State { ready, busy };

int main() {
    Scores scores{7, 8, 9};
    std::vector<std::vector<int> > grid{{1, 2}, {3, 4}};
    State state = State::ready;

    std::cout << "score=" << scores[1] << '\n';
    std::cout << "cell=" << grid[1][0] << '\n';
    std::cout << "ready=" << (state == State::ready) << '\n';
}
