#include <iostream>

[[deprecated("use new_total")]]
int old_total(int first, int second) {
    return first + second;
}

int new_total(int first, int second) {
    return first + second;
}

int main() {
    // Migrated call: the deprecated wrapper remains for compatibility.
    std::cout << "total=" << new_total(20, 23) << '\n';
}
