#include <array>
#include <iostream>
#include <queue>
#include <stack>

int main() {
    std::stack<int> undo;
    undo.push(1);
    undo.push(2);

    std::queue<int> tasks;
    tasks.push(3);
    tasks.push(4);

    std::priority_queue<int> urgent;
    urgent.push(5);
    urgent.push(9);

    std::array<int, 3> ring{{0, 0, 0}};
    std::size_t write = 0;
    for (int value = 10; value <= 13; ++value) {
        ring[write] = value;
        write = (write + 1) % ring.size();
    }

    std::cout << "stack=" << undo.top() << '\n';
    std::cout << "queue=" << tasks.front() << '\n';
    std::cout << "priority=" << urgent.top() << '\n';
    std::cout << "ring=" << ring[0] << ',' << ring[1] << ',' << ring[2] << '\n';
}
