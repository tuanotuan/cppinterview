#include <iostream>

[[deprecated("use new_total instead")]]
int old_total(int left, int right) {
    return left + right;
}

int new_total(int left, int right) {
    return left + right;
}

int main() {
    // Calling old_total(2, 3) would intentionally produce a warning.
    std::cout << "total: " << new_total(2, 3) << "\n";
}
