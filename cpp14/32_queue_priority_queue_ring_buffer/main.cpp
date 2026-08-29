#include <array>
#include <cstddef>
#include <iostream>
#include <initializer_list>
#include <queue>

int main() {
    std::queue<int> fifo;
    std::priority_queue<int> priorities;
    for (int value : {3, 9, 5}) {
        fifo.push(value);
        priorities.push(value);
    }

    std::array<int, 3> ring{};
    std::size_t head = 0;
    std::size_t count = 0;
    auto push_ring = [&](int value) {
        ring[(head + count) % ring.size()] = value;
        if (count < ring.size()) ++count;
        else head = (head + 1) % ring.size();
    };
    for (int value : {10, 20, 30, 40}) push_ring(value);

    std::cout << "fifo front: " << fifo.front() << "\n";
    std::cout << "priority top: " << priorities.top() << "\nring:";
    for (std::size_t i = 0; i < count; ++i)
        std::cout << ' ' << ring[(head + i) % ring.size()];
    std::cout << "\n";
}
