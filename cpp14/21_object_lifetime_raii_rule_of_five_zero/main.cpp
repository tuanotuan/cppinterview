#include <iostream>
#include <utility>
#include <vector>

struct Buffer {
    std::vector<int> data; // vector provides Rule-of-Zero ownership
};

int main() {
    Buffer original{{1, 2, 3}};
    Buffer copy = original;
    Buffer moved = std::move(copy);

    std::cout << "original size: " << original.data.size() << "\n";
    std::cout << "moved size: " << moved.data.size() << "\n";
} // every vector releases its own storage
