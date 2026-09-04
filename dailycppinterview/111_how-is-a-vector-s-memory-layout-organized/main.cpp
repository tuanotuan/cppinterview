// Daily C++ Interview Q111: How is a vector’s memory layout organized?
// Key: A `std::vector` stores its elements contiguously in one allocation and tracks a logical
// size within a capacity. Growth beyond capacity allocates a new block and moves or copies
// elements, invalidating pointers, references, and iterators to the old storage.
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values;
    values.reserve(4);
    values.push_back(1);
    values.push_back(2);
    std::cout << values.size() << ' ' << values.capacity() << ' '
              << static_cast<const void*>(values.data()) << '\n';
}
