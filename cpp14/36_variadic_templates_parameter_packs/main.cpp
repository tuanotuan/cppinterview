#include <iostream>

template <class... Values>
void print_all(const Values&... values) {
    int sink[] = {0, ((void)(std::cout << values << ' '), 0)...};
    (void)sink;
    std::cout << "\ncount: " << sizeof...(values) << "\n";
}

int main() {
    print_all(7, "days", 3.5);
}
