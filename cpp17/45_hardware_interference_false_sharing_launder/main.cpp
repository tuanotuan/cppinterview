#include <cstddef>
#include <iostream>
#include <new>

struct Record {
    const int value;
};

int main() {
    const bool hints_are_positive =
        std::hardware_destructive_interference_size > 0 &&
        std::hardware_constructive_interference_size > 0;

    alignas(Record) unsigned char storage[sizeof(Record)];
    Record* first = new (storage) Record{1};
    first->~Record();
    new (storage) Record{2};
    Record* current = std::launder(first);

    std::cout << "interference hints: " << hints_are_positive << '\n';
    std::cout << "replacement: " << current->value << '\n';
    current->~Record();
}
