#include <condition_variable>
#include <iostream>
#include <mutex>
#include <queue>
#include <thread>

int main() {
    std::mutex mutex;
    std::condition_variable condition;
    std::queue<int> jobs;
    bool done = false;
    int total = 0;

    std::thread consumer([&] {
        for (;;) {
            std::unique_lock lock{mutex};
            condition.wait(lock, [&] { return !jobs.empty() || done; });
            if (jobs.empty() && done) break;
            const int job = jobs.front();
            jobs.pop();
            lock.unlock();
            total += job;
        }
    });

    std::thread producer([&] {
        for (int job : {10, 20, 30}) {
            {
                std::lock_guard lock{mutex};
                jobs.push(job);
            }
            condition.notify_one();
        }
        {
            std::lock_guard lock{mutex};
            done = true;
        }
        condition.notify_one();
    });

    producer.join();
    consumer.join();
    std::cout << "processed sum: " << total << '\n';
}
