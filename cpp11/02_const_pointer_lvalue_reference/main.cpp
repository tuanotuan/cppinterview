#include <iostream>

int main() {
    int value = 10;
    const int limit = 100;

    int* pointer = &value;       // stores value's address
    int& reference = value;      // another name for value
    const int* read_only = &limit;

    *pointer += 5;
    reference *= 2;

    std::cout << "value=" << value << '\n';
    std::cout << "limit=" << *read_only << '\n';
}
