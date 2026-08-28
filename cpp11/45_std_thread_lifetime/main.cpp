#include <iostream>
#include <thread>

void compute(int& result) {
    result = 6 * 7;
}

int main() {
    int result = 0;
    std::thread worker(compute, std::ref(result));

    std::cout << "joinable=" << worker.joinable() << '\n';
    worker.join(); // wait and synchronize before reading result

    std::cout << "result=" << result << '\n';
}
