// Daily C++ Interview Q011: What is the static initialization order fiasco?
// Key: The static initialization order fiasco occurs when dynamically initialized objects in
// different translation units depend on each other; their relative initialization order is
// unspecified. A use can therefore observe an object before its dynamic initialization.
#include <iostream>

int next_id() {
    static int value = 0;
    return ++value;
}

int main() {
    std::cout << next_id() << ' ' << next_id() << '\n';
}
